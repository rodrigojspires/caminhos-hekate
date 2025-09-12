"use client"

import { useState } from "react"
import { Play, Clock, BookOpen, Star, Calendar, CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Course {
  id: string
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
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'title'>('recent')

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

  const filteredCourses = courses.filter(course => {
    if (filter === 'all') return true
    return course.status === filter
  })

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        if (!a.lastAccessed && !b.lastAccessed) return 0
        if (!a.lastAccessed) return 1
        if (!b.lastAccessed) return -1
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
      case 'progress':
        return b.progress - a.progress
      case 'title':
        return a.title.localeCompare(b.title)
      default:
        return 0
    }
  })

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
          href="/courses"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Explorar Cursos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0 overflow-hidden">
      {/* Filters and Sort */}
      <div className="bg-card rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Todos ({courses.length})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'in_progress'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Em Progresso ({courses.filter(c => c.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Concluídos ({courses.filter(c => c.status === 'completed').length})
            </button>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-input bg-background rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="recent">Mais Recentes</option>
            <option value="progress">Maior Progresso</option>
            <option value="title">Nome A-Z</option>
          </select>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-4 min-w-0">
        {sortedCourses.map((course) => (
          <div key={course.id} className="bg-card rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-6">
              <div className="flex gap-4">
                {/* Course Thumbnail */}
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

                {/* Course Info */}
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

                  {/* Progress Bar */}
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
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium text-foreground">{course.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{course.completedLessons}/{course.totalLessons} aulas</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/courses/${course.id}`}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Continuar
                      </Link>
                      <button className="px-4 py-2 border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                        Detalhes
                      </button>
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