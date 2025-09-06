"use client"

import { X } from 'lucide-react'

interface Filters {
  search: string
  role: string
  subscription: string
  status: string
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
      subscription: '',
      status: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  }

  // Verificar se há filtros ativos
  const hasActiveFilters = filters.role || filters.subscription || filters.status

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro por Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Usuário
          </label>
          <select
            value={filters.role}
            onChange={(e) => onFiltersChange({ role: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos os tipos</option>
            <option value="USER">Usuário</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        {/* Filtro por Assinatura */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Assinatura
          </label>
          <select
            value={filters.subscription}
            onChange={(e) => onFiltersChange({ subscription: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todas as assinaturas</option>
            <option value="FREE">Gratuito</option>
            <option value="PREMIUM">Premium</option>
            <option value="VIP">VIP</option>
          </select>
        </div>

        {/* Filtro por Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="SUSPENDED">Suspenso</option>
          </select>
        </div>

        {/* Ordenação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ordenar por
          </label>
          <div className="flex gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => onFiltersChange({ sortBy: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="createdAt">Data de criação</option>
              <option value="name">Nome</option>
              <option value="email">Email</option>
              <option value="updatedAt">Última atualização</option>
            </select>
            
            <select
              value={filters.sortOrder}
              onChange={(e) => onFiltersChange({ sortOrder: e.target.value as 'asc' | 'desc' })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            <span className="text-sm text-gray-600">Filtros ativos:</span>
            
            {filters.role && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                Tipo: {filters.role === 'USER' ? 'Usuário' : 'Admin'}
                <button
                  onClick={() => onFiltersChange({ role: '' })}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {filters.subscription && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                Assinatura: {{
                  FREE: 'Gratuito',
                  PREMIUM: 'Premium',
                  VIP: 'VIP'
                }[filters.subscription]}
                <button
                  onClick={() => onFiltersChange({ subscription: '' })}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                Status: {{
                  ACTIVE: 'Ativo',
                  INACTIVE: 'Inativo',
                  SUSPENDED: 'Suspenso'
                }[filters.status]}
                <button
                  onClick={() => onFiltersChange({ status: '' })}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </div>
  )
}