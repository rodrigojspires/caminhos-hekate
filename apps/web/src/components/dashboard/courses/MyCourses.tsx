"use client"

import { Play, Clock, BookOpen, Calendar, CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

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
}

interface MyCoursesProps {
  courses: Course[]
  loading?: boolean
  onCourseSelect?: (courseId: string) => void
}

export function MyCourses({ courses, loading = false, onCourseSelect }: MyCoursesProps) {
  const getStatusIcon = (status: Course['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Play className="w-5 h-5 text-blue-500" />
      case 'not_started':
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getStatusText = (status: Course['status']) => {
    switch (status) {
      case 'completed':
        return 'Concluído'
      case 'in_progress':
        return 'Em Progresso'
      case 'not_started':
        return 'Não Iniciado'
    }
  }

  const getLevelColor = (level: Course['level']) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
    }
  }

  const getLevelText = (level: Course['level']) => {
    switch (level) {
      case 'beginner':
        return 'Iniciante'
      case 'intermediate':
        return 'Intermediário'
      case 'advanced':
        return 'Avançado'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-card rounded-lg shadow-sm border p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="w-32 h-24 bg-muted rounded-lg"></div>
              <div className="flex-1">
                <div className="h-5 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded mb-4 w-3/4"></div>
                <div className="h-2 bg-muted rounded mb-2"></div>
                <div className="flex gap-4">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
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
        <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Nenhum curso encontrado</h3>
        <p className="text-muted-foreground mb-6">Explore nosso catálogo e comece sua jornada de aprendizado.</p>
        <Link
          href="/cursos"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Explorar Cursos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0 overflow-hidden">
      {/* Lista de Cursos (sem filtros internos) */}
      <div className="space-y-4 min-w-0">
        {courses.map((course) => (
          <div key={course.id} className="bg-card rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-6">
              <div className="flex gap-4">
                {/* Miniatura do Curso */}
                <div className="relative w-32 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
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
                      <h3 className="text-lg font-semibold text-foreground mb-1">{course.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{course.instructor}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(course.status)}
                      <span className="text-sm font-medium text-foreground">
                        {getStatusText(course.status)}
                      </span>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{course.description}</p>

                  {/* Barra de Progresso */}
                  <div className="mb-3">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{course.duration}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{course.progress}% concluído</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                        {getLevelText(course.level)}
                      </span>
                      {/* Rating removido por ausência de sistema de avaliação */}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{course.completedLessons}/{course.totalLessons} aulas</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/cursos/${course.slug}`}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Continuar
                      </Link>
                      <Link
                        href={`/cursos/${course.slug}`}
                        className="px-4 py-2 border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        Detalhes
                      </Link>
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