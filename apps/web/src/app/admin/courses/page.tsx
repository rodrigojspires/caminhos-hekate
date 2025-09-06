'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  Users
} from 'lucide-react'
import { CourseTable } from '@/components/admin/CourseTable'
import CourseFilters from '@/components/admin/CourseFilters'
import CourseStats from '@/components/admin/CourseStats'
import { SearchInput } from '@/components/admin/SearchInput'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { Pagination } from '@/components/admin/Pagination'
import { CourseStatus, CourseLevel } from '@hekate/database'

interface Course {
  id: string
  title: string
  slug: string
  description?: string
  shortDescription?: string
  price?: number
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

interface CourseStats {
  overview: {
    totalCourses: number
    totalEnrollments: number
    totalRevenue: number
    averagePrice: number
    enrollmentGrowth: number
  }
  coursesByStatus: Record<CourseStatus, number>
  coursesByLevel: Record<CourseLevel, number>
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
  const [stats, setStats] = useState<CourseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCourses, setTotalCourses] = useState(0)
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
  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch('/api/admin/courses/stats')
      const data = await response.json()

      if (response.ok) {
        setStats(data)
      } else {
        console.error('Erro ao carregar estatísticas:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setStatsLoading(false)
    }
  }

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
        fetchStats()
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
      fetchStats()
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
        status: CourseStatus.DRAFT
      }

      delete (duplicatedCourse as any).id
      delete (duplicatedCourse as any).createdAt
      delete (duplicatedCourse as any).updatedAt
      delete (duplicatedCourse as any)._count

      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedCourse)
      })

      if (response.ok) {
        toast.success('Curso duplicado com sucesso')
        fetchCourses()
        fetchStats()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao duplicar curso')
      }
    } catch (error) {
      toast.error('Erro ao duplicar curso')
    }
  }

  // Exportar dados
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const params = new URLSearchParams({ format, type: 'courses' })
      
      // Adicionar filtros à exportação
      if (filters.status) params.append('status', filters.status)
      if (filters.level) params.append('level', filters.level)
      if (filters.dateFrom) params.append('startDate', filters.dateFrom)
      if (filters.dateTo) params.append('endDate', filters.dateTo)

      const response = await fetch(`/api/admin/courses/export?${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cursos_${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Dados exportados com sucesso')
      } else {
        toast.error('Erro ao exportar dados')
      }
    } catch (error) {
      toast.error('Erro ao exportar dados')
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
    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cursos</h1>
          <p className="text-gray-600">Gerencie os cursos da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => router.push('/admin/courses/new')}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo Curso
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <CourseStats />

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
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
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
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-blue-700">
            {selectedCourses.length} curso(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-1.5 text-red-700 bg-red-100 rounded hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Deletar
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-gray-200">
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
              fetchStats()
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