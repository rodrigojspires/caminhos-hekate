'use client'

import { useState } from 'react'
import { MyCourses } from './MyCourses'
import { CourseFilters } from './CourseFilters'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Course {
  id: string
  title: string
  description: string
  thumbnail: string
  instructor: string
  duration: string
  progress: number
  status: 'not_started' | 'in_progress' | 'completed'
  rating: number
  totalLessons: number
  completedLessons: number
  lastAccessed?: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  enrolledAt: string
  totalStudyTime: number
  estimatedTimeRemaining: number
}

interface CoursesClientProps {
  inProgressCourses: Course[]
  completedCourses: Course[]
  notStartedCourses: Course[]
}

export function CoursesClient({ 
  inProgressCourses, 
  completedCourses, 
  notStartedCourses 
}: CoursesClientProps) {
  const [filteredInProgress, setFilteredInProgress] = useState(inProgressCourses)
  const [filteredCompleted, setFilteredCompleted] = useState(completedCourses)
  const [filteredNotStarted, setFilteredNotStarted] = useState(notStartedCourses)
  const [loading, setLoading] = useState(false)

  const handleFilterChange = (filters: {
    search?: string
    category?: string
    level?: string
    sort?: string
  }) => {
    setLoading(true)
    
    // Aplicar filtros a todos os arrays de cursos
    const applyFilters = (courses: Course[]) => {
      let filtered = [...courses]

      // Filtro de busca
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filtered = filtered.filter(course => 
          course.title.toLowerCase().includes(searchTerm) ||
          course.instructor.toLowerCase().includes(searchTerm) ||
          course.description.toLowerCase().includes(searchTerm)
        )
      }

      // Filtro de categoria
      if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(course => 
          course.category.toLowerCase() === filters.category?.toLowerCase()
        )
      }

      // Filtro de nível
      if (filters.level && filters.level !== 'all') {
        filtered = filtered.filter(course => 
          course.level === filters.level
        )
      }

      // Ordenação
      if (filters.sort) {
        switch (filters.sort) {
          case 'title':
            filtered.sort((a, b) => a.title.localeCompare(b.title))
            break
          case 'progress':
            filtered.sort((a, b) => b.progress - a.progress)
            break
          case 'recent':
            filtered.sort((a, b) => {
              const dateA = a.lastAccessed ? new Date(a.lastAccessed) : new Date(a.enrolledAt)
              const dateB = b.lastAccessed ? new Date(b.lastAccessed) : new Date(b.enrolledAt)
              return dateB.getTime() - dateA.getTime()
            })
            break
          case 'rating':
            filtered.sort((a, b) => b.rating - a.rating)
            break
          default:
            break
        }
      }

      return filtered
    }

    // Simular delay de loading
    setTimeout(() => {
      setFilteredInProgress(applyFilters(inProgressCourses))
      setFilteredCompleted(applyFilters(completedCourses))
      setFilteredNotStarted(applyFilters(notStartedCourses))
      setLoading(false)
    }, 300)
  }

  const handleCourseSelect = (courseId: string) => {
    // Navegar para a página do curso
    window.location.href = `/courses/${courseId}`
  }

  return (
    <Tabs defaultValue="in-progress" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="in-progress" className="flex items-center gap-2">
          Em Andamento
          {inProgressCourses.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {inProgressCourses.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="not-started" className="flex items-center gap-2">
          Não Iniciados
          {notStartedCourses.length > 0 && (
            <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
              {notStartedCourses.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          Concluídos
          {completedCourses.length > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
              {completedCourses.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <CourseFilters onFilterChange={handleFilterChange} />

      <TabsContent value="in-progress" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Cursos em Andamento</h2>
        </div>
        <MyCourses 
          courses={filteredInProgress}
          loading={loading}
          onCourseSelect={handleCourseSelect}
        />
      </TabsContent>

      <TabsContent value="not-started" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Cursos Não Iniciados</h2>
        </div>
        <MyCourses 
          courses={filteredNotStarted}
          loading={loading}
          onCourseSelect={handleCourseSelect}
        />
      </TabsContent>

      <TabsContent value="completed" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Cursos Concluídos</h2>
        </div>
        <MyCourses 
          courses={filteredCompleted}
          loading={loading}
          onCourseSelect={handleCourseSelect}
        />
      </TabsContent>
    </Tabs>
  )
}