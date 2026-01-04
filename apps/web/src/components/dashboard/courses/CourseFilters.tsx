"use client"

import { useState, useEffect } from "react"
import { Search, Filter, BookOpen, Clock, Star } from "lucide-react"
import { useDashboardVocabulary } from "@/components/dashboard/DashboardVocabularyProvider"

interface CourseFiltersProps {
  onFilterChange: (filters: {
    search?: string
    category?: string
    level?: string
    status?: string
    sort?: string
  }) => void
}

export function CourseFilters({ onFilterChange }: CourseFiltersProps) {
  const { apply } = useDashboardVocabulary()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [level, setLevel] = useState("all")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("recent")
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true)
        const res = await fetch('/api/categories')
        if (!res.ok) throw new Error('Falha ao buscar categorias')
        const data = await res.json()
        setCategories(data.categories || [])
      } catch (e) {
        console.error('Erro ao carregar categorias', e)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onFilterChange({ search: value, category, level, status, sort })
  }

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    onFilterChange({ search, category: value, level, status, sort })
  }

  const handleLevelChange = (value: string) => {
    setLevel(value)
    onFilterChange({ search, category, level: value, status, sort })
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    onFilterChange({ search, category, level, status: value, sort })
  }

  const handleSortChange = (value: string) => {
    setSort(value)
    onFilterChange({ search, category, level, status, sort: value })
  }

  return (
    <div className="temple-card p-6 mb-6">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--temple-text-secondary))] w-5 h-5" />
          <input
            type="text"
            placeholder={apply("Buscar rituais...")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-[hsl(var(--temple-border-subtle))] rounded-lg bg-[hsl(var(--temple-surface-2))] text-[hsl(var(--temple-text-primary))] placeholder:text-[hsl(var(--temple-text-secondary))] focus:ring-2 focus:ring-[hsl(var(--temple-accent-gold))] focus:border-transparent"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--temple-text-secondary))] mb-2">
              {apply("Categoria")}
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--temple-text-secondary))] w-4 h-4" />
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[hsl(var(--temple-border-subtle))] rounded-lg bg-[hsl(var(--temple-surface-2))] text-[hsl(var(--temple-text-primary))] focus:ring-2 focus:ring-[hsl(var(--temple-accent-gold))] focus:border-transparent appearance-none"
              >
                <option value="all">Todas as Categorias</option>
                {loadingCategories ? (
                  <option value="" disabled>Carregando...</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--temple-text-secondary))] mb-2">
              {apply("Nível")}
            </label>
            <div className="relative">
              <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--temple-text-secondary))] w-4 h-4" />
              <select
                value={level}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[hsl(var(--temple-border-subtle))] rounded-lg bg-[hsl(var(--temple-surface-2))] text-[hsl(var(--temple-text-primary))] focus:ring-2 focus:ring-[hsl(var(--temple-accent-gold))] focus:border-transparent appearance-none"
              >
                <option value="all">Todos os Níveis</option>
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--temple-text-secondary))] mb-2">
              {apply("Status")}
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--temple-text-secondary))] w-4 h-4" />
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[hsl(var(--temple-border-subtle))] rounded-lg bg-[hsl(var(--temple-surface-2))] text-[hsl(var(--temple-text-primary))] focus:ring-2 focus:ring-[hsl(var(--temple-accent-gold))] focus:border-transparent appearance-none"
              >
                <option value="all">Todos os Status</option>
                <option value="not_started">Não Iniciado</option>
                <option value="in_progress">Em Progresso</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--temple-text-secondary))] mb-2">
              {apply("Ordenar por")}
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--temple-text-secondary))] w-4 h-4" />
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[hsl(var(--temple-border-subtle))] rounded-lg bg-[hsl(var(--temple-surface-2))] text-[hsl(var(--temple-text-primary))] focus:ring-2 focus:ring-[hsl(var(--temple-accent-gold))] focus:border-transparent appearance-none"
              >
                <option value="recent">Mais Recentes</option>
                <option value="progress">Maior Progresso</option>
                <option value="title">Nome A-Z</option>
                <option value="rating">Melhor Avaliação</option>
                <option value="duration">Menor Duração</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[hsl(var(--temple-border-subtle))]">
          <span className="text-sm font-medium text-[hsl(var(--temple-text-secondary))]">{apply("Filtros rápidos:")}</span>
          <button
            onClick={() => {
              setStatus('in_progress')
              setSort('recent')
              onFilterChange({ search, category, level, status: 'in_progress', sort: 'recent' })
            }}
            className="px-3 py-1 text-xs rounded-full bg-[hsl(var(--temple-accent-gold))]/10 text-[hsl(var(--temple-accent-gold))] hover:bg-[hsl(var(--temple-accent-gold))]/20 transition-colors"
          >
            {apply("Continuar estudando")}
          </button>
          <button
            onClick={() => {
              setStatus('not_started')
              setSort('rating')
              onFilterChange({ search, category, level, status: 'not_started', sort: 'rating' })
            }}
            className="px-3 py-1 text-xs rounded-full bg-[hsl(var(--temple-accent-gold))]/10 text-[hsl(var(--temple-accent-gold))] hover:bg-[hsl(var(--temple-accent-gold))]/20 transition-colors"
          >
            {apply("Novos rituais")}
          </button>
          <button
            onClick={() => {
              setStatus('completed')
              setSort('recent')
              onFilterChange({ search, category, level, status: 'completed', sort: 'recent' })
            }}
            className="px-3 py-1 text-xs rounded-full bg-[hsl(var(--temple-accent-gold))]/10 text-[hsl(var(--temple-accent-gold))] hover:bg-[hsl(var(--temple-accent-gold))]/20 transition-colors"
          >
            {apply("Concluídos")}
          </button>
        </div>
      </div>
    </div>
  )
}
