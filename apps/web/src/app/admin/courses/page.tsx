'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Plus, 
  Filter, 
  Trash2
} from 'lucide-react'
import { CourseTable } from '@/components/admin/CourseTable'
import CourseFilters from '@/components/admin/CourseFilters'
import CourseStats from '@/components/admin/CourseStats'
import { SearchInput } from '@/components/admin/SearchInput'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { Pagination } from '@/components/admin/Pagination'
import { CourseStatus, CourseLevel, CourseAccessModel, SubscriptionTier } from '@hekate/database'

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
  accessModels: CourseAccessModel[]
  tier: SubscriptionTier
  featuredImage?: string
  introVideo?: string
  duration?: number
  maxStudents?: number
  tags: string[]
  metaTitle?: string
  metaDescription?: string
  categoryId?: string | null
  category?: {
    id: string
    name: string
    slug: string
  } | null
  createdAt: string
  updatedAt: string
  _count: {
    enrollments: number
    modules: number
  }
}

interface Filters {
  status?: CourseStatus
  level?: CourseLevel
  featured?: boolean
  priceMin?: number
  priceMax?: number
  dateFrom?: string
  dateTo?: string
}

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCourses, setTotalCourses] = useState(0)
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)
  const limit = 10

  // Buscar cursos
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search,
        sortBy,
        sortOrder
      })

      // Adicionar filtros
      if (filters.status) params.append('status', filters.status)
      if (filters.level) params.append('level', filters.level)
      if (filters.featured !== undefined) params.append('featured', filters.featured.toString())
      if (filters.priceMin !== undefined) params.append('priceMin', filters.priceMin.toString())
      if (filters.priceMax !== undefined) params.append('priceMax', filters.priceMax.toString())
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const response = await fetch(`/api/admin/courses?${params}`)
      const data = await response.json()

      if (response.ok) {
        setCourses(data.courses)
        setTotalPages(data.pagination.pages)
        setTotalCourses(data.pagination.total)
      } else {
        toast.error(data.error || 'Erro ao carregar cursos')
      }
    } catch (error) {
      toast.error('Erro ao carregar cursos')
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, filters, sortBy, sortOrder])

  // Buscar estatísticas
  const triggerStatsRefresh = useCallback(() => {
    setStatsRefreshKey(prev => prev + 1)
  }, [])

  // Deletar curso
  const handleDelete = async (courseId: string) => {
    if (!confirm('Tem certeza que deseja deletar este curso?')) return

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Curso deletado com sucesso')
        fetchCourses()
        triggerStatsRefresh()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao deletar curso')
      }
    } catch (error) {
      toast.error('Erro ao deletar curso')
    }
  }

  // Deletar cursos selecionados
  const handleBulkDelete = async () => {
    if (selectedCourses.length === 0) return
    if (!confirm(`Tem certeza que deseja deletar ${selectedCourses.length} curso(s)?`)) return

    try {
      const promises = selectedCourses.map(id => 
        fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
      )
      
      await Promise.all(promises)
      toast.success(`${selectedCourses.length} curso(s) deletado(s) com sucesso`)
      setSelectedCourses([])
      fetchCourses()
      triggerStatsRefresh()
    } catch (error) {
      toast.error('Erro ao deletar cursos')
    }
  }

  // Duplicar curso
  const handleDuplicate = async (course: Course) => {
    try {
      const duplicatedCourse = {
        ...course,
        title: `${course.title} (Cópia)`,
        slug: `${course.slug}-copy-${Date.now()}`,
        status: CourseStatus.DRAFT,
        accessModels: Array.from(new Set(course.accessModels ?? ['ONE_TIME'])),
        tier: (course.accessModels ?? []).includes('SUBSCRIPTION') ? course.tier : SubscriptionTier.FREE,
        categoryId: course.categoryId ?? null
      }

      delete (duplicatedCourse as any).id
      delete (duplicatedCourse as any).createdAt
      delete (duplicatedCourse as any).updatedAt
      delete (duplicatedCourse as any)._count
      delete (duplicatedCourse as any).category

      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedCourse)
      })

      if (response.ok) {
        toast.success('Curso duplicado com sucesso')
      fetchCourses()
      triggerStatsRefresh()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao duplicar curso')
      }
    } catch (error) {
      toast.error('Erro ao duplicar curso')
    }
  }


  // Aplicar filtros
  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  // Limpar filtros
  const handleClearFilters = () => {
    setFilters({})
    setCurrentPage(1)
  }

  // Efeitos
  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

useEffect(() => {
  triggerStatsRefresh()
}, [triggerStatsRefresh])

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cursos</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie os cursos da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/courses/new')}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Curso
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <CourseStats key={statsRefreshKey} />

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por título, descrição..."
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              showFilters 
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      {showFilters && (
        <CourseFilters
          filters={filters}
          onFiltersChange={handleApplyFilters}
          onClear={handleClearFilters}
        />
      )}

      {/* Ações em Lote */}
      {selectedCourses.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg">
          <span className="text-blue-700 dark:text-blue-300">
            {selectedCourses.length} curso(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-1.5 text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              <Trash2 className="w-4 h-4" />
              Deletar
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <CourseTable
            courses={courses}
            selectedCourses={selectedCourses}
            onSelectionChange={setSelectedCourses}
            onSort={(field) => {
              if (sortBy === field) {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
              } else {
                setSortBy(field)
                setSortOrder('asc')
              }
            }}
            onRefresh={() => {
              fetchCourses()
              triggerStatsRefresh()
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        )}
      </div>

      {/* Paginação */}
      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalCourses}
          itemsPerPage={limit}
        />
      )}
    </div>
  )
}
