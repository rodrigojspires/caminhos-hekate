"use client"

import { useState } from "react"
import { Search, Filter, BookOpen, Clock, Star } from "lucide-react"

interface CourseFiltersProps {
  onSearchChange: (search: string) => void
  onCategoryChange: (category: string) => void
  onLevelChange: (level: string) => void
  onStatusChange: (status: string) => void
  onSortChange: (sort: string) => void
}

export default function CourseFilters({
  onSearchChange,
  onCategoryChange,
  onLevelChange,
  onStatusChange,
  onSortChange
}: CourseFiltersProps) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [level, setLevel] = useState("all")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("recent")

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange(value)
  }

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    onCategoryChange(value)
  }

  const handleLevelChange = (value: string) => {
    setLevel(value)
    onLevelChange(value)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    onStatusChange(value)
  }

  const handleSortChange = (value: string) => {
    setSort(value)
    onSortChange(value)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar cursos..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nível
            </label>
            <div className="relative">
              <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={level}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordenar por
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
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
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Filtros rápidos:</span>
          <button
            onClick={() => {
              handleStatusChange('in_progress')
              handleSortChange('recent')
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
          >
            Continuar estudando
          </button>
          <button
            onClick={() => {
              handleStatusChange('not_started')
              handleSortChange('rating')
            }}
            className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
          >
            Novos cursos
          </button>
          <button
            onClick={() => {
              handleStatusChange('completed')
              handleSortChange('recent')
            }}
            className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
          >
            Concluídos
          </button>
        </div>
      </div>
    </div>
  )
}