'use client'

import { useState } from 'react'
import { CourseStatus, CourseLevel } from '@hekate/database'
import { Filter, X } from 'lucide-react'

interface CourseFiltersProps {
  filters: {
    status?: CourseStatus
    level?: CourseLevel
    featured?: boolean
  }
  onFiltersChange: (filters: any) => void
  onClear: () => void
}

export default function CourseFilters({ filters, onFiltersChange, onClear }: CourseFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const statusOptions = [
    { value: 'PUBLISHED', label: 'Publicado' },
    { value: 'DRAFT', label: 'Rascunho' },
    { value: 'ARCHIVED', label: 'Arquivado' }
  ]

  const levelOptions = [
    { value: 'BEGINNER', label: 'Iniciante' },
    { value: 'INTERMEDIATE', label: 'Intermediário' },
    { value: 'ADVANCED', label: 'Avançado' },
    { value: 'EXPERT', label: 'Especialista' }
  ]

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${
          hasActiveFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
        }`}
      >
        <Filter className="w-4 h-4" />
        Filtros
        {hasActiveFilters && (
          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
            {Object.values(filters).filter(v => v !== undefined).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Filtros</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos os status</option>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nível */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível
                </label>
                <select
                  value={filters.level || ''}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos os níveis</option>
                  {levelOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destaque */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destaque
                </label>
                <select
                  value={filters.featured === undefined ? '' : filters.featured.toString()}
                  onChange={(e) => handleFilterChange('featured', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Em destaque</option>
                  <option value="false">Não destacados</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={onClear}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpar
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}