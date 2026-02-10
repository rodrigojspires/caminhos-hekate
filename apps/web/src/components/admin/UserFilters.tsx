"use client"

import { X } from 'lucide-react'

interface Filters {
  search: string
  role: string
  subscriptionTier: string
  registrationPortal: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface UserFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Partial<Filters>) => void
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  // Limpar todos os filtros
  const clearFilters = () => {
    onFiltersChange({
      search: '',
      role: '',
      subscriptionTier: '',
      registrationPortal: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  }

  // Verificar se há filtros ativos
  const hasActiveFilters = filters.role || filters.subscriptionTier || filters.registrationPortal

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro por Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo de Usuário
          </label>
          <select
            value={filters.role}
            onChange={(e) => onFiltersChange({ role: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos os tipos</option>
            <option value="ADMIN">Administrador</option>
            <option value="EDITOR">Editor</option>
            <option value="MEMBER">Membro</option>
            <option value="VISITOR">Visitante</option>
          </select>
        </div>

        {/* Filtro por Assinatura */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo de Assinatura
          </label>
          <select
            value={filters.subscriptionTier}
            onChange={(e) => onFiltersChange({ subscriptionTier: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todas as assinaturas</option>
            <option value="FREE">Gratuito</option>
            <option value="INICIADO">Iniciado</option>
            <option value="ADEPTO">Adepto</option>
            <option value="SACERDOCIO">Sacerdócio</option>
          </select>
        </div>

        {/* Filtro por Portal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Portal de cadastro
          </label>
          <select
            value={filters.registrationPortal}
            onChange={(e) => onFiltersChange({ registrationPortal: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos os portais</option>
            <option value="CAMINHOS_DE_HEKATE">Caminhos de Hekate</option>
            <option value="MAHA_LILAH">Maha Lilah</option>
          </select>
        </div>

        {/* Ordenação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ordenar por
          </label>
          <div className="flex gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => onFiltersChange({ sortBy: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="createdAt">Data de criação</option>
              <option value="name">Nome</option>
              <option value="email">Email</option>
              <option value="updatedAt">Última atualização</option>
            </select>
            
            <select
              value={filters.sortOrder}
              onChange={(e) => onFiltersChange({ sortOrder: e.target.value as 'asc' | 'desc' })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filtros ativos e ações */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filtros ativos:</span>
            
            {filters.role && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                Tipo: {filters.role}
                <button
                  onClick={() => onFiltersChange({ role: '' })}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {filters.subscriptionTier && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                Assinatura: {filters.subscriptionTier}
                <button
                  onClick={() => onFiltersChange({ subscriptionTier: '' })}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.registrationPortal && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                Portal: {filters.registrationPortal === 'CAMINHOS_DE_HEKATE' ? 'Caminhos de Hekate' : 'Maha Lilah'}
                <button
                  onClick={() => onFiltersChange({ registrationPortal: '' })}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </div>
  )
}
