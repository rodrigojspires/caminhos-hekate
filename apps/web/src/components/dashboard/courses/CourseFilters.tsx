"use client"

import { useState } from "react"
import { Search, Filter, BookOpen, Clock, Star } from "lucide-react"

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
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [level, setLevel] = useState("all")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("recent")

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
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar cursos..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Categoria
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
              >
                <option value="all">Todas as Categorias</option>
                <option value="tarot">Tarô</option>
                <option value="astrologia">Astrologia</option>
                <option value="numerologia">Numerologia</option>
                <option value="cristais">Cristais</option>
                <option value="meditacao">Meditação</option>
                <option value="rituais">Rituais</option>
                <option value="herbalismo">Herbalismo</option>
              </select>
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Nível
            </label>
            <div className="relative">
              <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <select
                value={level}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
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
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Status
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
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
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Ordenar por
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
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
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <span className="text-sm font-medium text-muted-foreground">Filtros rápidos:</span>
          <button
            onClick={() => {
              setStatus('in_progress')
              setSort('recent')
              onFilterChange({ search, category, level, status: 'in_progress', sort: 'recent' })
            }}
            className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Continuar estudando
          </button>
          <button
            onClick={() => {
              setStatus('not_started')
              setSort('rating')
              onFilterChange({ search, category, level, status: 'not_started', sort: 'rating' })
            }}
            className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Novos cursos
          </button>
          <button
            onClick={() => {
              setStatus('completed')
              setSort('recent')
              onFilterChange({ search, category, level, status: 'completed', sort: 'recent' })
            }}
            className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Concluídos
          </button>
        </div>
      </div>
    </div>
  )
}