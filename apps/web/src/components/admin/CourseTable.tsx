'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { 
  Edit, 
  Trash2, 
  Users, 
  Copy, 
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal
} from 'lucide-react'
import { CourseStatus, CourseLevel } from '@hekate/database'
import { LoadingSpinner } from './LoadingSpinner'

interface Course {
  id: string
  title: string
  slug: string
  description?: string
  shortDescription?: string
  price?: number | null
  comparePrice?: number | null
  status: CourseStatus
  level: CourseLevel
  featured: boolean
  featuredImage?: string
  introVideo?: string
  duration?: number
  maxStudents?: number
  tags: string[]
  metaTitle?: string
  metaDescription?: string
  createdAt: string
  updatedAt: string
  _count: {
    enrollments: number
    modules: number
  }
}

interface CourseTableProps {
  courses: Course[]
  loading?: boolean
  onRefresh?: () => void
  selectedCourses?: string[]
  onSelectionChange?: (courseIds: string[]) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (field: string) => void
}

export function CourseTable({
  courses,
  loading = false,
  onRefresh,
  selectedCourses = [],
  onSelectionChange,
  sortBy,
  sortOrder,
  onSort
}: CourseTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  // Selecionar/deselecionar todos os cursos
  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? courses.map(course => course.id) : [])
    }
  }

  // Selecionar/deselecionar curso individual
  const handleSelectCourse = (courseId: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedCourses, courseId])
      } else {
        onSelectionChange(selectedCourses.filter(id => id !== courseId))
      }
    }
  }

  // Duplicar curso
  const handleDuplicate = async (course: Course) => {
    try {
      setActionLoading(course.id)
      
      const duplicateData = {
        title: `${course.title} (Cópia)`,
        slug: `${course.slug}-copy-${Date.now()}`,
        description: course.description,
        shortDescription: course.shortDescription,
        price: course.price != null ? Number(course.price) : 0,
        comparePrice: course.comparePrice != null ? Number(course.comparePrice) : null,
        status: CourseStatus.DRAFT,
        level: course.level,
        featured: false,
        featuredImage: course.featuredImage,
        introVideo: course.introVideo,
        duration: course.duration,
        maxStudents: course.maxStudents,
        tags: Array.isArray(course.tags) ? course.tags : [],
        metaTitle: course.metaTitle,
        metaDescription: course.metaDescription
      }

      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateData)
      })

      if (response.ok) {
        toast.success('Curso duplicado com sucesso')
        onRefresh?.()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao duplicar curso')
      }
    } catch (error) {
      toast.error('Erro ao duplicar curso')
    } finally {
      setActionLoading(null)
      setDropdownOpen(null)
    }
  }

  // Excluir curso
  const handleDelete = async (course: Course) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o curso "${course.title}"?\n\n` +
      `Esta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      setActionLoading(course.id)

      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Curso excluído com sucesso')
        onRefresh?.()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao excluir curso')
      }
    } catch (error) {
      toast.error('Erro ao excluir curso')
    } finally {
      setActionLoading(null)
      setDropdownOpen(null)
    }
  }

  // Renderizar ícone de ordenação
  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      : <ArrowDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
  }

  // Renderizar status
  const renderStatus = (status: CourseStatus) => {
    const statusConfig: Record<CourseStatus, { label: string; className: string }> = {
      PUBLISHED: { label: 'Publicado', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
      DRAFT: { label: 'Rascunho', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' },
      ARCHIVED: { label: 'Arquivado', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }
    }

    const config = statusConfig[status]
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }

  // Renderizar nível
  const renderLevel = (level: CourseLevel) => {
    const levelLabels: Record<CourseLevel, string> = {
      BEGINNER: 'Iniciante',
      INTERMEDIATE: 'Intermediário',
      ADVANCED: 'Avançado',
      EXPERT: 'Especialista'
    }
    return levelLabels[level]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="mb-4">Nenhum curso encontrado</p>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Criar Primeiro Curso
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedCourses.length === courses.length && courses.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-900"
                />
              </th>
              
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => onSort?.('title')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100 transition-colors"
                >
                  Curso
                  {renderSortIcon('title')}
                </button>
              </th>
              
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => onSort?.('status')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100 transition-colors"
                >
                  Status
                  {renderSortIcon('status')}
                </button>
              </th>
              
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => onSort?.('level')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100 transition-colors"
                >
                  Nível
                  {renderSortIcon('level')}
                </button>
              </th>
              
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => onSort?.('price')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100 transition-colors"
                >
                  Preço
                  {renderSortIcon('price')}
                </button>
              </th>
              
              <th className="px-4 py-3 text-left">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Inscrições</span>
              </th>
              
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => onSort?.('createdAt')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100 transition-colors"
                >
                  Criado em
                  {renderSortIcon('createdAt')}
                </button>
              </th>
              
              <th className="w-20 px-4 py-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Ações</span>
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(course.id)}
                    onChange={(e) => handleSelectCourse(course.id, e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-900"
                />
              </td>
                
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {course.featuredImage && (
                      <Image
                        src={course.featuredImage}
                        alt={course.title}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/courses/${course.id}`}
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
                        >
                          {course.title}
                        </Link>
                        {course.featured && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {course.shortDescription}
                      </p>
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  {renderStatus(course.status)}
                </td>
                
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {renderLevel(course.level)}
                  </span>
                </td>
                
                <td className="px-4 py-4">
                  {(() => {
                    const priceValue = course.price != null ? Number(course.price) : null
                    const compareValue = course.comparePrice != null ? Number(course.comparePrice) : null

                    if (priceValue == null || Number.isNaN(priceValue)) {
                      return <span className="text-sm text-gray-600 dark:text-gray-300">Gratuito</span>
                    }

                    return (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          R$ {priceValue.toFixed(2)}
                        </span>
                        {compareValue != null && compareValue > priceValue && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 line-through">
                            R$ {compareValue.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </td>
                
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {course._count.enrollments}
                    </span>
                  </div>
                </td>
                
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(course.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </td>
                
                <td className="px-4 py-4">
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === course.id ? null : course.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      disabled={actionLoading === course.id}
                    >
                      {actionLoading === course.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <MoreHorizontal className="w-4 h-4" />
                      )}
                    </button>
                    
                    {dropdownOpen === course.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          <Link
                            href={`/admin/courses/${course.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setDropdownOpen(null)}
                          >
                            <Edit className="w-4 h-4" />
                            Editar
                          </Link>
                          
                          <Link
                            href={`/admin/courses/${course.id}/enrollments`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setDropdownOpen(null)}
                          >
                            <Users className="w-4 h-4" />
                            Inscrições
                          </Link>
                          
                          <button
                            onClick={() => handleDuplicate(course)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicar
                          </button>
                          
                          <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                          
                          <button
                            onClick={() => handleDelete(course)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
