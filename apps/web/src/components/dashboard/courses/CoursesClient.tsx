'use client'

import { useState } from 'react'
import { MyCourses } from './MyCourses'
import { CourseFilters } from './CourseFilters'

interface Course {
  id: string
  slug: string
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
  enrollmentStatus: 'active' | 'pending'
  hasFreeLessons: boolean
  checkoutUrl: string
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
  // Unificar todos os cursos em uma única lista
  const allCourses: Course[] = [
    ...inProgressCourses,
    ...notStartedCourses,
    ...completedCourses
  ]

  const [filteredCourses, setFilteredCourses] = useState(allCourses)
  const [loading, setLoading] = useState(false)

  const handleFilterChange = (filters: {
    search?: string
    category?: string
    level?: string
    status?: string
    sort?: string
  }) => {
    setLoading(true)

    let filtered = [...allCourses]

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

    // Filtro de status
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(course => course.status === filters.status)
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
        case 'duration':
          filtered.sort((a, b) => {
            const parseHours = (d: string) => {
              const match = d.match(/\d+/)
              return match ? parseInt(match[0], 10) : 0
            }
            return parseHours(a.duration) - parseHours(b.duration)
          })
          break
        default:
          break
      }
    }

    // Simular delay de loading
    setTimeout(() => {
      setFilteredCourses(filtered)
      setLoading(false)
    }, 300)
  }

  const handleCourseSelect = (courseId: string) => {
    // Navegar para a página do curso
    window.location.href = `/courses/${courseId}`
  }

  return (
    <div className="space-y-6">
      {/* Filtros superiores */}
      <CourseFilters onFilterChange={handleFilterChange} />

      {/* Listagem única de cursos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Meus Cursos</h2>
          {filteredCourses.length > 0 && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {filteredCourses.length} cursos
            </span>
          )}
        </div>
        <MyCourses 
          courses={filteredCourses}
          loading={loading}
          onCourseSelect={handleCourseSelect}
        />
      </div>
    </div>
  )
}
